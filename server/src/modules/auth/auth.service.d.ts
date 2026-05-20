import type { RegisterDto, LoginDto } from './auth.dto';
import type { AuthResponse } from '@genius/shared';
export declare function register(dto: RegisterDto): Promise<AuthResponse>;
export declare function login(dto: LoginDto): Promise<AuthResponse>;
//# sourceMappingURL=auth.service.d.ts.map