import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AdminRoleGuard } from "../auth/admin-role.guard";
import {
  AdminUpdateCredentialsDto,
  AdminUpdateNotificationSettingsDto,
  AdminUpdateStoreProfileDto,
} from "./dto/admin.dto";
import { AdminSettingsService } from "./admin-settings.service";
import { AppSettingsService } from "../settings/app-settings.service";

@ApiBearerAuth()
@ApiTags("Admin — Settings")
@UseGuards(AdminRoleGuard)
@Controller("admin")
export class AdminSettingsController {
  constructor(
    private readonly settingsService: AdminSettingsService,
    private readonly appSettings: AppSettingsService,
  ) {}

  @Get("settings/credentials")
  @ApiOperation({
    summary: "List integration credentials (secrets masked) and their source",
  })
  @ApiResponse({ status: 200, description: "Masked credentials" })
  getCredentials() {
    return this.appSettings.listMasked();
  }

  @Put("settings/credentials")
  @ApiOperation({
    summary:
      "Store integration credentials in the database (Razorpay, Delhivery)",
  })
  @ApiBody({ type: AdminUpdateCredentialsDto })
  @ApiResponse({ status: 200, description: "Masked credentials after update" })
  updateCredentials(@Body() dto: AdminUpdateCredentialsDto) {
    return this.appSettings.setMany({ ...dto });
  }

  @Get("settings/notifications")
  @ApiOperation({ summary: "Get notification preferences" })
  @ApiResponse({ status: 200, description: "Notification preferences" })
  getNotifications() {
    return this.settingsService.getNotificationSettings();
  }

  @Put("settings/notifications")
  @ApiOperation({ summary: "Update notification preferences" })
  @ApiBody({ type: AdminUpdateNotificationSettingsDto })
  @ApiResponse({ status: 200, description: "Updated settings" })
  updateNotifications(@Body() dto: AdminUpdateNotificationSettingsDto) {
    return this.settingsService.updateNotificationSettings(dto);
  }

  @Get("app/profile")
  @ApiOperation({ summary: "Get store profile" })
  @ApiResponse({ status: 200, description: "Store profile" })
  getProfile() {
    return this.settingsService.getStoreProfile();
  }

  @Put("app/profile")
  @ApiOperation({ summary: "Update store profile" })
  @ApiBody({ type: AdminUpdateStoreProfileDto })
  @ApiResponse({ status: 200, description: "Updated store profile" })
  updateProfile(@Body() dto: AdminUpdateStoreProfileDto) {
    return this.settingsService.updateStoreProfile(dto);
  }
}
