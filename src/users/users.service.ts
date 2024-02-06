import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { fieldEncryptionExtension } from 'prisma-field-encryption';
import { UserServiceError } from './errors/users.service.error';

@Injectable()
export class UsersService {
  private readonly databaseService: DatabaseService;

  constructor(databaseService: DatabaseService) {
    this.databaseService = databaseService.$extends(
      fieldEncryptionExtension(),
    ) as DatabaseService;
  }

  findOneById(id: number) {
    return this.databaseService.user.findUnique({ where: { id } });
  }

  findOneByEmailHash(emailHash: string) {
    return this.databaseService.user.findUnique({ where: { emailHash } });
  }

  findOneByEmail(email: string) {
    return this.databaseService.user.findUnique({ where: { email } });
  }

  create(userCreateInput: Prisma.UserCreateInput) {
    return this.databaseService.user
      .findUnique({
        where: { email: userCreateInput.email },
      })
      .then((user) => {
        if (user) {
          throw new UserServiceError(
            'A new user cannot be created with this email',
          );
        }
        return this.databaseService.user.create({ data: userCreateInput });
      });
  }

  update(userId: number, data: Prisma.UserUpdateInput) {
    return this.databaseService.user
      .update({
        where: { id: userId },
        data,
      })
      .catch((error) => {
        if (error.code === 'P2025') {
          throw new UserServiceError('User not found to update');
        } else {
          throw error;
        }
      });
  }
  
}
