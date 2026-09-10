import { DefaultEntity } from 'src/entity';
import { User } from 'src/user/entities/user.entity';
/* eslint-disable prettier/prettier */
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, OneToOne } from 'typeorm';


@Entity()
export class Referrer  extends DefaultEntity {
   



  @ManyToOne(() => User, user => user.referredUsers)
  referrer: User;


  @ManyToOne(() => User)
  referredUser: User;
  

    
}
