import { NestFactory } from "@nestjs/core";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<INestApplication>(AppModule, {
    rawBody: true,
  });
  app.enableCors({
    origin: "*",
  });

  const port = process.env.PORT;
  await app.listen(port);
  console.log(`Server running at port ${port}`);
}
bootstrap();
