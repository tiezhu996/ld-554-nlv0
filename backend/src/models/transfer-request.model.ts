import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { TransferStatus, type TransferStatusValue } from '../constants/enums.js';

export class TransferRequest extends Model<InferAttributes<TransferRequest>, InferCreationAttributes<TransferRequest>> {
  declare id: CreationOptional<number>;
  declare employeeId: number;
  declare targetDepartment: string;
  declare targetPosition: string;
  declare targetStoreId: number;
  declare effectiveDate: string;
  declare status: TransferStatusValue;
  declare applicantId: number;
  declare approverId: number | null;
  declare approvedAt: Date | null;
  declare rejectReason: string | null;
  declare processedAt: Date | null;
  declare remark: string | null;
}

TransferRequest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    targetDepartment: { type: DataTypes.STRING(60), allowNull: false },
    targetPosition: { type: DataTypes.STRING(60), allowNull: false },
    targetStoreId: { type: DataTypes.INTEGER, allowNull: false },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM(...Object.values(TransferStatus)), allowNull: false, defaultValue: TransferStatus.PENDING },
    applicantId: { type: DataTypes.INTEGER, allowNull: false },
    approverId: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    rejectReason: { type: DataTypes.STRING(255), allowNull: true },
    processedAt: { type: DataTypes.DATE, allowNull: true },
    remark: { type: DataTypes.STRING(255), allowNull: true }
  },
  { sequelize, tableName: 'transfer_requests', indexes: [{ fields: ['employee_id', 'status'] }] }
);
