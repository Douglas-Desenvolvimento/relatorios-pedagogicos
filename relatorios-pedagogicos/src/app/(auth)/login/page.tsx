import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "PPI login",
  description: "Login de Coordenador ou administrador no PPI",
};

export default function SignIn() {
  return <SignInForm />;
}