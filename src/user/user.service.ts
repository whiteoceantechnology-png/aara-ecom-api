import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateAddressDto, UpdateAddressDto, AddressResponseDto, UserProfileResponseDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getProfile(userId: number): Promise<UserProfileResponseDto> {
    return this.userRepository.getProfile(userId);
  }

  async getAddresses(userId: number): Promise<AddressResponseDto[]> {
    const addresses = await this.userRepository.getAddresses(userId);
    return addresses.map((a) => this.formatAddress(a));
  }

  async createAddress(userId: number, dto: CreateAddressDto): Promise<AddressResponseDto> {
    const address = await this.userRepository.createAddress(userId, dto);
    return this.formatAddress(address);
  }

  async updateAddress(userId: number, addressId: number, dto: UpdateAddressDto): Promise<AddressResponseDto> {
    const address = await this.userRepository.updateAddress(userId, addressId, dto);
    return this.formatAddress(address);
  }

  async removeAddress(userId: number, addressId: number): Promise<{ message: string }> {
    return this.userRepository.removeAddress(userId, addressId);
  }

  private formatAddress(a: {
    id: number;
    firstName: string;
    lastName: string;
    houseNo: string;
    areaStreet: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
  }): AddressResponseDto {
    return {
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      houseNo: a.houseNo,
      areaStreet: a.areaStreet,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      country: a.country,
      default: a.isDefault ? 'yes' : 'no',
    };
  }
}
