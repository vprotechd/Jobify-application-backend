import { Platform } from "react-native";

export const colors={
  primary:"#1f5eff",primaryDark:"#1746c7",bg:"#eef3f8",card:"#ffffff",
  text:"#0b1736",muted:"#64748b",border:"#d9e2ec",success:"#15803d",
  danger:"#dc2626",warning:"#c46a00",purple:"#6d4aff",
  surface:"#f7f9fc",navy:"#0b1736"
};
export const shadow=Platform.select({web:{boxShadow:"0px 5px 14px rgba(11, 23, 54, 0.07)"},default:{shadowColor:"#0b1736",shadowOpacity:.07,shadowRadius:14,shadowOffset:{width:0,height:5},elevation:3}});
