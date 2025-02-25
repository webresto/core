import RMSAdapter from "../../../adapters/rms/RMSAdapter";
import { DishRecord } from "../../../models/Dish";
import { GroupRecord } from "../../../models/Group";
import { OrderRecord } from "../../../models/Order";
// todo: fix types model instance to {%ModelName%}Record for Dish";
// todo: fix types model instance to {%ModelName%}Record for Group";
// todo: fix types model instance to {%ModelName%}Record for Order";
import dishGenerator from "../../generators/dish.generator";
import groupGenerator from "../../generators/group.generator";



export class TestRMS  extends RMSAdapter {
    protected async initialized(): Promise<void> {
        return
    }
    protected async customInitialize(): Promise<void> {
        return

    }
    protected async loadOutOfStocksDishes(concept?: string): Promise<DishRecord[]> {
        return
    }
    protected  async nomenclatureHasUpdated(): Promise<boolean> {
        return true
    }

/**
 Since 7 dishes are created for each group, the total number of dishes will be 88 groups * 7 dishes = 616 dishes.
*  */
        protected async loadNomenclatureTree(rmsGroupIds?: string[]): Promise<GroupRecord[]> {
        let groups: GroupRecord[] = [];
        for(let i = 0; i < 4; i++){
            let group = groupGenerator();
            groups.push(group);
            for(let x = 0; x < 3; x++){        
                let subGroup = groupGenerator({ parentGroup: group.id });
                groups.push(subGroup);
                for(let y = 0; y < 2; y++){
                    let subSubGroup = groupGenerator({ parentGroup: subGroup.id });
                    groups.push(subSubGroup);
                    for(let z = 0; z < 2; z++){
                        let subSubSubGroup = groupGenerator({ parentGroup: subSubGroup.id });
                        groups.push(subSubSubGroup);
                    }
                }
            }
        } 
        return groups;
    }
    
    protected async loadProductsByGroup(group: GroupRecord): Promise<DishRecord[]> {
        let dishes = [];
        for(let i = 0; i < 7; i++) {
            dishes.push(dishGenerator({
                parentGroup: group.id,
                price: 100.1,
                name: undefined
            }));
        }
        return dishes;
    }


    public createOrder(orderData: OrderRecord): Promise<OrderRecord> {
        console.log("Method not implemented.");
        return
    }
    
    public checkOrder(orderData: OrderRecord): Promise<OrderRecord> {
        console.log("Method not implemented.");
        return
    }

    public api(method: string, params: any): Promise<any> {
        throw process.env[method] = JSON.stringify(params);
    }
}