import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class EventIdParamDto {
  @IsString()
  @IsNotEmpty({ message: 'Event ID is required' })
  id!: string;
}
