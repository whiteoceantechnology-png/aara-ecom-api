import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    jest.clearAllMocks();
  });

  // ─── findByUsername ───────────────────────────────────────────────────────────

  describe('findByUsername()', () => {
    it('should return a user when found by username', async () => {
      const mockUser = { id: 1, username: 'john_doe', password: 'hashed' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findByUsername('john_doe');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { username: 'john_doe' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByUsername('unknown');

      expect(result).toBeNull();
    });
  });

  // ─── findById ─────────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return a user when found by id', async () => {
      const mockUser = { id: 1, username: 'john_doe', password: 'hashed' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findById(1);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await repository.findById(99);

      expect(result).toBeNull();
    });
  });

  // ─── findByResetToken ─────────────────────────────────────────────────────────

  describe('findByResetToken()', () => {
    it('should return a user with the given reset token', async () => {
      const mockUser = { id: 1, username: 'john_doe', resetToken: 'abc123' };
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await repository.findByResetToken('abc123');

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({ where: { resetToken: 'abc123' } });
      expect(result).toEqual(mockUser);
    });

    it('should return null if reset token is not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await repository.findByResetToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  // ─── createUser ───────────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('should create a user and return id and username', async () => {
      const expected = { id: 1, username: 'john_doe' };
      mockPrismaService.user.create.mockResolvedValue(expected);

      const result = await repository.createUser('john_doe', 'hashed_password');

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: { username: 'john_doe', password: 'hashed_password' },
        select: { id: true, username: true },
      });
      expect(result).toEqual(expected);
    });
  });

  // ─── updateUser ───────────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    it('should update user data and return id and username', async () => {
      const expected = { id: 1, username: 'new_username' };
      mockPrismaService.user.update.mockResolvedValue(expected);

      const result = await repository.updateUser(1, { username: 'new_username' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { username: 'new_username' },
        select: { id: true, username: true },
      });
      expect(result).toEqual(expected);
    });
  });

  // ─── setResetToken ────────────────────────────────────────────────────────────

  describe('setResetToken()', () => {
    it('should set reset token and expiry on the user', async () => {
      const expiry = new Date();
      mockPrismaService.user.update.mockResolvedValue(undefined);

      await repository.setResetToken(1, 'reset-token', expiry);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { resetToken: 'reset-token', resetTokenExpiry: expiry },
      });
    });
  });

  // ─── clearResetToken ──────────────────────────────────────────────────────────

  describe('clearResetToken()', () => {
    it('should clear reset token and expiry on the user', async () => {
      mockPrismaService.user.update.mockResolvedValue(undefined);

      await repository.clearResetToken(1);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { resetToken: null, resetTokenExpiry: null },
      });
    });
  });
});
