import RMSAdapter, { OrderResponse } from "../../../adapters/rms/RMSAdapter";
import Dish from "../../../models/Dish";
import Group from "../../../models/Group";
import Order from "../../../models/Order";
import dishGenerator from "../../generators/dish.generator";
import groupGenerator from "../../generators/group.generator";



export class TestRMS  extends RMSAdapter {
    protected loadOutOfStocksDishes(concept?: string): Promise<Dish[]> {
        throw new Error("Method not implemented.");
    }
    protected  async nomenclatureHasUpdated(): Promise<boolean> {
        return true
    }

/**
 Since 7 dishes are created for each group, the total number of dishes will be 88 groups * 7 dishes = 616 dishes.
*  */
        protected async loadNomenclatureTree(rmsGroupIds?: string[]): Promise<Group[]> {
        let groups: Group[] = [];
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
    
    protected async loadProductsByGroup(group: Group): Promise<Dish[]> {
        let dishes = [];
        for(let i = 0; i < 7; i++) {
            dishes.push(dishGenerator({
                parentGroup: group.id, 
                price: 100.1
            }));
        }
        return dishes;
    }


    public createOrder(orderData: Order): Promise<OrderResponse> {
        throw new Error("Method not implemented.");
    }
    
    public checkOrder(orderData: Order): Promise<OrderResponse> {
        throw new Error("Method not implemented.");
    }

    public api(method: string, params: any): Promise<any> {
        throw process.env[method] = JSON.stringify(params);
    }
    
    // constructor() {
    //     super();
    // }
}