import { DefaultEntity } from "src/entity";
import { User } from "src/user/entities/user.entity";
import { Column, Double, Entity, JoinColumn, ManyToOne } from "typeorm";
@Entity()
export class TronwalletDeposits extends DefaultEntity{

    @Column()
    amount: number;

    @Column({  type: String })
    name: string;
    @Column({ nullable: true })
    from_address: string;

    @Column({ nullable: true })
    to_address: string;
  
    @Column({ unique:true })
    transaction_id: string;
    @Column({ nullable: true })
    block_timestamp: string;

    @Column({ nullable: true })
    transferType: string;
  //  @Column({ nullable: true })

    @ManyToOne(() => User, (user) => user.deposits, {
        onDelete: 'CASCADE',
      })
      @JoinColumn({ name: 'userId' })
      user: User;


}
