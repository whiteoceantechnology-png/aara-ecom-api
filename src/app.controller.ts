import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { Public } from "./auth/public.decorator";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
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
      email: this.config.get<string>("DELHIVERY_EMAIL", ""),
      password: this.config.get<string>("DELHIVERY_PASSWORD", ""),
    };
  }
}
