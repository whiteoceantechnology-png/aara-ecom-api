import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';
import { CreateVariantDto, UpdateVariantDto } from '../dto/variant.dto';

const mockVariant = {
  id: 1, productId: 1, packSizeId: 1, price: '31', sku: 'ASH-25',
  stockQuantity: 100, status: true, packSize: { id: 1, label: '25 g', size: '25', unit: 'g' },
};

const mockVariantsService = {
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('VariantsController', () => {
  let controller: VariantsController;
  let service: typeof mockVariantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VariantsController],
      providers: [{ provide: VariantsService, useValue: mockVariantsService }],
    }).compile();

    controller = module.get<VariantsController>(VariantsController);
    service = module.get(VariantsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create and return a variant', async () => {
      const dto: CreateVariantDto = { productId: 1, packSizeId: 1, price: 31, sku: 'ASH-25', stockQuantity: 100 };
      service.create.mockResolvedValue(mockVariant);
      const result = await controller.create(dto);
      expect(result).toEqual(mockVariant);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update and return the variant', async () => {
      const dto: UpdateVariantDto = { price: 40 };
      service.update.mockResolvedValue({ ...mockVariant, price: '40' });
      const result = await controller.update(1, dto);
      expect(result.price).toBe('40');
      expect(service.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when variant not found', async () => {
      service.update.mockRejectedValue(new NotFoundException());
      await expect(controller.update(99, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a variant and return success message', async () => {
      service.remove.mockResolvedValue({ message: 'Variant deleted successfully' });
      const result = await controller.remove(1);
      expect(result).toEqual({ message: 'Variant deleted successfully' });
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when variant not found', async () => {
      service.remove.mockRejectedValue(new NotFoundException());
      await expect(controller.remove(99)).rejects.toThrow(NotFoundException);
    });
  });
});
