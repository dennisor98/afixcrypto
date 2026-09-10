/* eslint-disable prettier/prettier */
import { Column, CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
export abstract class DefaultTimeStampEntity{
    @CreateDateColumn()
    createdAt: Date;
    @DeleteDateColumn()
    deleatedAt: Date;
    @UpdateDateColumn()
  updatedAt: Date;
}

export abstract class DefaultEntity extends DefaultTimeStampEntity{
    @PrimaryGeneratedColumn("uuid")
    id: string;

}
