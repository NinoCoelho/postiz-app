import { IsBoolean, IsIn, IsString, MinLength } from 'class-validator';

export class GeneratorDto {
  @IsString()
  @MinLength(10)
  research: string;

  @IsBoolean()
  isPicture: boolean;

  @IsString()
  @IsIn([
    'one_short_personal',
    'one_short_company', 
    'one_long_personal',
    'one_long_company',
    'thread_short_personal',
    'thread_short_company',
    'thread_long_personal',
    'thread_long_company'
  ])
  templateKey: 
    | 'one_short_personal'
    | 'one_short_company' 
    | 'one_long_personal'
    | 'one_long_company'
    | 'thread_short_personal'
    | 'thread_short_company'
    | 'thread_long_personal'
    | 'thread_long_company';
}
