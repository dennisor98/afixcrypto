
import { Column, Double, Entity, JoinColumn, ManyToOne } from "typeorm";
import { DefaultEntity } from "src/entity";
import { User } from "src/user/entities/user.entity";


export enum state {
    approved = 'approved',
    rejected = 'rejected',
    pending = 'pending',
  }
@Entity()
export class WithdrawalRequests extends DefaultEntity {


  @Column()
  amount: string;
  @Column()
  address: string;

  @ManyToOne(() => User, (user) => user.withdrawalsRequest, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;




  @Column({
    type: 'enum',
    enum: state,
    
  })
  status: state;

  @Column({ unique: true,nullable:true })
  txId: string;

}
