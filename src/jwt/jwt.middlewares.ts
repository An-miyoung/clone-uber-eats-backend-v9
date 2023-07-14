import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from './jwt.service';
import { UsersService } from 'src/users/users.service';

// 생성된 token 을 http req 에 실어서 front에게 보내기 위해 middleware 사용
@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly users: UsersService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    if ('x-jwt' in req.headers) {
      const token = req.headers['x-jwt'];
      // try {
      //   const decoded = this.jwtService.verify(token.toString());
      //   if (typeof decoded === 'object' && decoded.hasOwnProperty('id')) {
      //     const user = await this.users.findById(decoded['id']);
      //     req['user'] = user;
      //   }
      // } catch (error) {
      //   console.log(error);
      // }
    }
    next();
  }
}
