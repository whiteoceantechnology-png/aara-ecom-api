import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  updateUser: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ─── register ────────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('should call authService.register and return the result', async () => {
      const dto = { username: 'john_doe', password: 'Secret@123' };
      const expected = { id: 1, username: 'john_doe' };
      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── login ────────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('should call authService.login and return the token', async () => {
      const dto = { username: 'john_doe', password: 'Secret@123' };
      const expected = { token: 'mock.jwt.token' };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── updateUser ───────────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    it('should call authService.updateUser with id and dto and return result', async () => {
      const dto = { username: 'new_username' };
      const expected = { id: 1, username: 'new_username' };
      mockAuthService.updateUser.mockResolvedValue(expected);

      const result = await controller.updateUser(1, dto);

      expect(mockAuthService.updateUser).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── forgotPassword ───────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('should call authService.forgotPassword and return a message', async () => {
      const dto = { username: 'john_doe' };
      const expected = { message: 'Reset token generated. Use this token: abc123' };
      mockAuthService.forgotPassword.mockResolvedValue(expected);

      const result = await controller.forgotPassword(dto);

      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── resetPassword ────────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('should call authService.resetPassword and return a success message', async () => {
      const dto = { token: 'valid-token', newPassword: 'NewSecret@123' };
      const expected = { message: 'Password has been reset successfully' };
      mockAuthService.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword(dto);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
