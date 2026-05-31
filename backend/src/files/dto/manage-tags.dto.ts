import { IsArray, IsString, ArrayMaxSize, MaxLength } from 'class-validator';

export class ManageTagsDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags!: string[];
}
