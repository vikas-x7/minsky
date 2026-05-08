import { IsOptional, IsString, IsEmail } from 'class-validator';

export class QueryBookingsDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;
}
