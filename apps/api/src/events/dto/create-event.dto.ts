import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { PricingRulesConfig } from '@repo/database';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: 'Event name is required' })
  @MaxLength(100, { message: 'Event name must be less than 100 characters' })
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500, { message: 'Description must be less than 500 characters' })
  description?: string;

  @IsDateString({}, { message: 'Date must be a valid ISO 8601 date string' })
  date!: string;

  @IsString()
  @IsNotEmpty({ message: 'Venue is required' })
  @MaxLength(200, { message: 'Venue must be less than 200 characters' })
  venue!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'totalTickets must be a number' })
  @Min(1, { message: 'totalTickets must be at least 1' })
  totalTickets!: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'basePrice must be a number' })
  @Min(0.01, { message: 'basePrice must be greater than 0' })
  basePrice!: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'priceFloor must be a number' })
  @Min(0, { message: 'priceFloor cannot be negative' })
  @IsOptional()
  priceFloor?: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'priceCeiling must be a number' })
  @Min(0.01, { message: 'priceCeiling must be greater than 0' })
  @IsOptional()
  priceCeiling?: number;

  @IsObject()
  @IsOptional()
  pricingRules?: PricingRulesConfig;
}
