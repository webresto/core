import { expect } from "chai";
import {
  getAllowedOrderTransitions,
  getAllowedOrderTransitionsByRole,
  isOperatorUser,
} from "../../../../lib/order/OrderStateFlow";

/**
 * What a role may choose — the rule the orders board and the mobile application both narrow their
 * buttons by (plan, срез 2: «тесты на переходы по ролям»).
 *
 * An operator is told apart by the name of their group — `operator` or «оператор» — which is
 * fragile and known to be so (the plan files it under «Что нашлось попутно»); this test pins the
 * behaviour so a change to it cannot pass unnoticed.
 *
 * On a *placed* order the role changes nothing: everything an operator may not choose — CART,
 * CHECKOUT, PAYMENT — is only reachable from a basket, and a basket never reaches a board. That is
 * worth a test of its own: it is why the mobile application shows one set of buttons to everybody.
 */
describe("Order transitions by role", function () {
  const admin = { id: "admin", isAdministrator: true, groups: [{ name: "Operator" }] };
  const operator = { id: "operator", isAdministrator: false, groups: [{ name: "Operator" }] };
  const russian = { id: "russian", isAdministrator: false, groups: [{ name: "Оператор зала" }] };
  const manager = { id: "manager", isAdministrator: false, groups: [{ name: "Stock Manager" }] };

  it("knows an operator by their group, and never counts an administrator as one", function () {
    expect(isOperatorUser(operator)).to.equal(true);
    expect(isOperatorUser(russian), "the Russian name of the group counts too").to.equal(true);
    expect(isOperatorUser(admin), "an administrator is not limited, whatever their groups").to.equal(false);
    expect(isOperatorUser(manager)).to.equal(false);
    expect(isOperatorUser(null)).to.equal(false);
  });

  it("gives everyone the same choice on a placed order", function () {
    for (const state of ["ORDER", "COOKING", "ON_THE_WAY"]) {
      expect(getAllowedOrderTransitionsByRole(state, true), state)
        .to.deep.equal(getAllowedOrderTransitionsByRole(state, false));
      expect(getAllowedOrderTransitionsByRole(state, true), `${state}: the flow itself`)
        .to.deep.equal(getAllowedOrderTransitions(state));
    }
    expect(getAllowedOrderTransitionsByRole("ORDER", true)).to.deep.equal(["COOKING", "ON_THE_WAY", "DONE", "REJECT"]);
    expect(getAllowedOrderTransitionsByRole("COOKING", true)).to.deep.equal(["ON_THE_WAY", "DONE", "REJECT"]);
    expect(getAllowedOrderTransitionsByRole("ON_THE_WAY", true)).to.deep.equal(["DONE", "REJECT"]);
  });

  it("keeps a basket away from an operator, and a finished order away from everyone", function () {
    // Only an administrator may push a basket back and forth; these states are off every board.
    expect(getAllowedOrderTransitionsByRole("CHECKOUT", false)).to.deep.equal(["CART", "PAYMENT", "ORDER", "REJECT"]);
    expect(getAllowedOrderTransitionsByRole("CHECKOUT", true)).to.deep.equal(["REJECT"]);
    // Not even ORDER: placing a basket that is in payment is not among an operator's targets.
    expect(getAllowedOrderTransitionsByRole("PAYMENT", true)).to.deep.equal(["REJECT"]);

    for (const state of ["DONE", "REJECT"]) {
      expect(getAllowedOrderTransitionsByRole(state, true), state).to.deep.equal([]);
      expect(getAllowedOrderTransitionsByRole(state, false), state).to.deep.equal([]);
    }
  });
});
