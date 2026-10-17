
import { useTheme } from "../context/ThemeContext";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api from "../services/api";
import {
  styles,
  Header,
  Loader,
  Empty,
} from "../components/common";
import { colors } from "../theme/theme";

export default function Companies({ navigation }) {
  const { mode: __themeMode } = useTheme();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchCompanies = async () => {
      try {
        const response = await api.get("/companies");

        if (mounted) {
          setCompanies(
            response.data.companies ||
              response.data.data ||
              []
          );
        }
      } catch (error) {
        // Preserve the existing behavior if the request fails.
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCompanies();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: 40,
          paddingBottom: 30,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Header
        title="Companies"
        subtitle="Explore companies hiring on Jobify."
      />

      {loading ? (
        <Loader />
      ) : companies.length > 0 ? (
        companies.map((company) => (
          <TouchableOpacity
            style={styles.card}
            key={company._id}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate("CompanyDetails", {
                id: company._id,
                company,
              })
            }
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.primary + "18",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 21,
                    fontWeight: "900",
                    color: colors.primary,
                  }}
                >
                  {(company.name || "C")
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: colors.text,
                  }}
                >
                  {company.name || "Unnamed Company"}
                </Text>

                <Text
                  style={[
                    styles.muted,
                    { marginTop: 5 },
                  ]}
                >
                  {company.location ||
                    company.industry ||
                    "Company"}
                </Text>
              </View>

              <Text
                style={{
                  fontSize: 23,
                  color: colors.primary,
                  fontWeight: "700",
                }}
              >
                ›
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Empty text="No companies found." />
      )}
    </ScrollView>
  );
}
