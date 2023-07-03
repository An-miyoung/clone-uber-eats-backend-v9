import { Field } from '@nestjs/graphql';
import { IsDate, IsNumber } from 'class-validator';
import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class CoreEntity {
  @PrimaryGeneratedColumn()
  @Field(() => Number)
  @IsNumber()
  id: number;

  @CreateDateColumn()
  @Field(() => Date)
  @IsDate()
  created_at: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  @IsDate()
  updated_at: Date;
}
