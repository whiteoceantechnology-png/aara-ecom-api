import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, fallback?: string) => {
              if (key === "DELHIVERY_EMAIL") return "test@example.com";
              if (key === "DELHIVERY_PASSWORD") return "secret";
              return fallback ?? "";
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
    it("should return Delhivery credentials from config", () => {
      expect(appController.getDelhiveryCredentials()).toEqual({
        email: "test@example.com",
        password: "secret",
      });
    });
  });
});
