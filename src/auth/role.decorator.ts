import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'src/users/entities/user.entity';

// UserRole 의 key 만 가져와서 roles 에 넣으려고
export type AllowedRoles = keyof typeof UserRole | 'Any';

// 모든 resolver 가 사용할 수 있도록 @SetMetadata 를 여기서 하고 불러쓰도록
// resolver 가 Role 을 부르면 argument 로 제공한 roles 가 메타데이터내에 쓰여진다.
export const Role = (roles: AllowedRoles[]) => SetMetadata('roles', roles);
