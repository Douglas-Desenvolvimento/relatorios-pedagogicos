import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const senhaPadrao = await bcrypt.hash("123456", 10);
  const senhaCustom = await bcrypt.hash("260914Pd@", 10);

  await prisma.user.createMany({
    data: [
      {
        email: "admin@ppi.com",
        password: senhaPadrao,
        nome: "Administrador do Sistema",
        matricula: "ADM001",
        role: "ADMIN",
      },
      {
        email: "coordenador@ppi.com",
        password: senhaPadrao,
        nome: "Coordenador Pedagógico",
        matricula: "COORD001",
        role: "COORDENADOR",
      },
      {
        email: "paula.rlessa@rioeduca.net",
        password: senhaCustom,
        nome: "Paula Regina de Andrade Lessa",
        matricula: "271952-4",
        role: "COORDENADOR",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Usuários criados com sucesso!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
