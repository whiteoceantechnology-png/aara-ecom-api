import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppSettingsService } from "./settings/app-settings.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: AppSettingsService,
          useValue: {
            get: (key: string) => {
              if (key === "DELHIVERY_EMAIL") return "test@example.com";
              if (key === "DELHIVERY_PASSWORD") return "secret";
              return "";
            },
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe("root", () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe("Hello World!");
    });
  });

  describe("delhivery/credentials", () => {
    it("should return Delhivery credentials from settings", () => {
      expect(appController.getDelhiveryCredentials()).toEqual({
        email: "test@example.com",
        password: "secret",
      });
    });
  });
});
