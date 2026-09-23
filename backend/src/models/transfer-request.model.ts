import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes, type NonAttribute } from 'sequelize';
import { sequelize } from '../config/database.js';
import { TransferStatus, type TransferStatusValue } from '../constants/enums.js';
import type { Employee } from './employee.model.js';
import type { Store } from './store.model.js';
import type { User } from './user.model.js';

export class TransferRequest extends Model<InferAttributes<TransferRequest>, InferCreationAttributes<TransferRequest>> {
  declare id: CreationOptional<number>;
  declare employeeId: number;
  declare applicantId: number;
  declare targetDepartment: string;
  declare targetPosition: string;
  declare targetStoreId: number;
  declare effectiveDate: string;
  declare status: TransferStatusValue;
  declare reviewerId: number | null;
  declare reviewComment: string | null;
  declare reviewedAt: CreationOptional<Date | null>;
  declare transferredShiftCount: CreationOptional<number>;

  declare employee?: NonAttribute<Employee>;
  declare targetStore?: NonAttribute<Store>;
  declare applicant?: NonAttribute<User>;
  declare reviewer?: NonAttribute<User>;
}

TransferRequest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    applicantId: { type: DataTypes.INTEGER, allowNull: false },
    targetDepartment: { type: DataTypes.STRING(60), allowNull: false },
    targetPosition: { type: DataTypes.STRING(60), allowNull: false },
    targetStoreId: { type: DataTypes.INTEGER, allowNull: false },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(TransferStatus)), allowNull: false, defaultValue: TransferStatus.PENDING },
    reviewerId: { type: DataTypes.INTEGER, allowNull: true },
    reviewComment: { type: DataTypes.STRING(255), allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    transferredShiftCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
  },
  { sequelize, tableName: 'transfer_requests' }
);
