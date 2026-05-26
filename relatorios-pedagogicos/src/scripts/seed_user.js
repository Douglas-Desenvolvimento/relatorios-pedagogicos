import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const WEAK_PASSWORDS = new Set(["123456", "123@ppi", "password", "senha123"]);

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} deve ser definido no ambiente; nao versione senhas de seed.`);
  }
  return value;
}

function assertStrongPassword(name, value) {
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);

  if (
    value.length < 12 ||
    !hasUpper ||
    !hasLower ||
    !hasDigit ||
    !hasSpecial ||
    WEAK_PASSWORDS.has(value.toLowerCase())
  ) {
    throw new Error(`${name} deve ter 12+ caracteres com maiuscula, minuscula, numero e simbolo.`);
  }
}

async function upsertUser({ email, password, nome, matricula, login, role }) {
  assertStrongPassword(`Senha de ${email}`, password);
  const passwordHash = await bcrypt.hash(password, 12);

  return prisma.user.upsert({
    where: { email },
    update: {
      password: passwordHash,
      nome,
      matricula,
      login,
      role,
      active: true,
      mustChangePassword: true,
    },
    create: {
      email,
      password: passwordHash,
      nome,
      matricula,
      login,
      role,
      active: true,
      mustChangePassword: true,
    },
  });
}

async function main() {
  await upsertUser({
    email: process.env.SEED_ADMIN_EMAIL?.trim() || "admin.demo@example.test",
    password: requiredEnv("SEED_ADMIN_PASSWORD"),
    nome: "Administrador Demo",
    matricula: "ADM-DEMO",
    login: "admin.demo",
    role: "ADMIN",
  });

  if (process.env.SEED_COORDENADOR_PASSWORD?.trim()) {
    await upsertUser({
      email: process.env.SEED_COORDENADOR_EMAIL?.trim() || "coordenador.demo@example.test",
      password: process.env.SEED_COORDENADOR_PASSWORD.trim(),
      nome: "Coordenador Demo",
      matricula: "COORD-DEMO",
      login: "coordenador.demo",
      role: "COORDENADOR",
    });
  }

  console.log("Usuarios administrativos de seed criados sem credenciais versionadas.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
