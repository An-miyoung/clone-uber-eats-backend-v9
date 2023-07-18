import { Field, InputType, ObjectType, PickType } from '@nestjs/graphql';
import { Payment } from '../entities/payment.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@ObjectType()
export class GetPaymentsOutput extends CoreOutput {
  @Field(() => [Payment], { nullable: true })
  payments?: Payment[];
}
