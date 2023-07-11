import { InputType, ObjectType, PickType } from '@nestjs/graphql';
import { Order } from '../entities/order.entity';
import { CoreOutput } from 'src/common/dtos/output.dto';

@InputType()
export class CreateOrderInput extends PickType(Order, ['customer', 'dishes']) {}

@ObjectType()
export class CreateOrderOutput extends CoreOutput {}
