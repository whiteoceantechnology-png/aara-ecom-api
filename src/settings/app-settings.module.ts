import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AppSettingsService } from "./app-settings.service";

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AppSettingsService],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
