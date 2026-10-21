import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { Public } from "./auth/public.decorator";
import { AppSettingsService } from "./settings/app-settings.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly settings: AppSettingsService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get("delhivery/credentials")
  @ApiTags("Delhivery")
  @ApiOperation({ summary: "Get Delhivery login credentials" })
  getDelhiveryCredentials() {
    return {
      email: this.settings.get("DELHIVERY_EMAIL"),
      password: this.settings.get("DELHIVERY_PASSWORD"),
    };
  }
}
