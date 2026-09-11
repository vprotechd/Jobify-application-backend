import React, { useCallback, useState } from "react";
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";
import { useFocusEffect } from "@react-navigation/native";
import api, { apiError } from "../services/api";
import { Empty, Header, Loader, styles } from "../components/common";
import { colors } from "../theme/theme";
import { useAuth } from "../context/AuthContext";

const makeHtml = (order, user) => `<!doctype html><html><body style="font-family:Arial;padding:24px"><h2>Jobify CV Credits</h2><p>Secure Razorpay checkout is loading...</p><script src="https://checkout.razorpay.com/v1/checkout.js"></script><script>const o=${JSON.stringify(order)},u=${JSON.stringify(user || {})};const r=new Razorpay({key:o.keyId,amount:o.amount,currency:o.currency,name:'Jobify',description:'Candidate CV credits',order_id:o.orderId,prefill:{name:u.name||'',email:u.email||''},theme:{color:'#2563eb'},handler:function(x){window.ReactNativeWebView.postMessage(JSON.stringify({type:'success',data:x}))},modal:{ondismiss:function(){window.ReactNativeWebView.postMessage(JSON.stringify({type:'cancel'}))}}});r.open();</script></body></html>`;

const loadRazorpayScript = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve(window.Razorpay);
    return;
  }

  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.onload = () => resolve(window.Razorpay);
  script.onerror = () => reject(new Error("Unable to load Razorpay checkout."));
  document.body.appendChild(script);
});

export default function CvPackages() {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkout, setCheckout] = useState(null);

  const load = async () => {
    try {
      const [packagesResponse, accessResponse] = await Promise.all([
        api.get("/payments/packages"),
        api.get("/recruiter/candidates/access"),
      ]);
      setPackages(packagesResponse.data.packages || []);
      setAccess(accessResponse.data.cvAccess || {});
    } catch (error) {
      Alert.alert("CV Credits", apiError(error));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const verifyPayment = async (paymentData) => {
    try {
      const response = await api.post("/payments/verify", paymentData);
      Alert.alert("Payment successful", response.data.message || "Credits added.");
      setCheckout(null);
      load();
    } catch (error) {
      Alert.alert("Payment", apiError(error, "Payment verification failed."));
      setCheckout(null);
    }
  };

  const openWebCheckout = async (order) => {
    try {
      const Razorpay = await loadRazorpayScript();
      const instance = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Jobify",
        description: "Candidate CV credits",
        order_id: order.orderId,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#2563eb" },
        handler: verifyPayment,
        modal: { ondismiss: () => setCheckout(null) },
      });
      instance.open();
    } catch (error) {
      Alert.alert("Payment", apiError(error, "Unable to load Razorpay checkout."));
    }
  };

  const buy = async (pkg) => {
    try {
      const response = await api.post("/payments/orders", { packageId: pkg._id });
      const providerOrder = response.data.order;
      const order = {
        keyId: response.data.keyId,
        orderId: providerOrder.id,
        amount: providerOrder.amount,
        currency: providerOrder.currency,
      };

      if (Platform.OS === "web") {
        await openWebCheckout(order);
      } else {
        setCheckout(order);
      }
    } catch (error) {
      Alert.alert("Payment", apiError(error, "Unable to start payment."));
    }
  };

  if (loading) return <Loader />;

  if (checkout) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <TouchableOpacity style={{ padding: 16 }} onPress={() => setCheckout(null)}>
          <Text style={{ color: colors.muted, fontWeight: "700" }}>Cancel checkout</Text>
        </TouchableOpacity>
        <WebView
          originWhitelist={["*"]}
          source={{ html: makeHtml(checkout, user) }}
          onMessage={async (event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              if (message.type === "cancel") {
                setCheckout(null);
                return;
              }
              if (message.type === "success") await verifyPayment(message.data);
            } catch (error) {
              Alert.alert("Payment", apiError(error, "Payment verification failed."));
              setCheckout(null);
            }
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header
        eyebrow="Recruiter"
        title="CV Credit Packages"
        subtitle={`Free remaining: ${access?.freeRemaining ?? 0} | Paid credits: ${access?.paidCredits ?? 0}`}
      />
      {!packages.length ? <Empty text="No CV packages are available." /> : packages.map((pkg) => (
        <View style={styles.card} key={pkg._id}>
          <Text style={{ fontSize: 19, fontWeight: "800" }}>{pkg.name}</Text>
          <Text style={styles.muted}>{pkg.description || "Candidate CV access credits."}</Text>
          <Text style={{ fontSize: 32, fontWeight: "900", marginTop: 10 }}>INR {pkg.price}</Text>
          <Text style={{ marginTop: 5, fontWeight: "700" }}>{pkg.credits} CV credits</Text>
          <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => buy(pkg)}>
            <Text style={styles.buttonText}>Buy with Razorpay</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
