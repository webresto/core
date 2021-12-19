const isPromise = require("is-promise");
const sleep = require("util").promisify(setTimeout);

type func = (...args: any) => any | Promise<any>;

/**
 * Класс, позволяющий создавать события и ожидать исполнения их подписок, будь то синхронная функция или функция, возвращающая
 * Promise. В момент выполнения события запускает все подписки на исполнение, запоминая результат работы каждой (успешный,
 * с ошибкой или время ожидания вышло).
 */
export default class AwaitEmitter {
  events: Event[];
  name: string;
  timeout: number;

  /**
   * @param name - название нового эмиттера
   * @param timeout - указывает сколько милисекунд ожидать функции, которые возвращают Promise.
   */
  constructor(name: string, timeout?: number) {
    this.name = name;
    this.timeout = timeout || 1000;
    this.events = [];
  }

  /**
   * Подписка на событие
   * @param name - название события
   * @param fn - функция подписчик
   */
  on(name: string, fn: func): AwaitEmitter;
  /**
   * Подписка на событие
   * @param name - название события
   * @param label - метка подписчика (используется для отладки)
   * @param fn - функция подписчика
   */
  on(name: string, label: string, fn: func): AwaitEmitter;

  on(name: string, label: string | func, fn?: func): AwaitEmitter {
    sails.log.silly(`AwaitEmitter > new subscribe: [ ${name} ] from: ${label}`);
    if (typeof label === "function") {
      fn = label;
      label = "";
    }

    let event = this.events.filter((l) => l.name === name)[0];
    if (!event) {
      event = new Event(name);
      this.events.push(event);
    }
    event.fns.push({
      fn: fn,
      label: label,
    });
    return this;
  }

  /**
   * Эмиттит событие с названием name иаргументами args. Если функция подписчик отдаёт не Promise, то она считается синхронной
   * и выполняется сразу же, если же функция слушатель возвращает Promise, то она вместе с остальными такими же слушателями
   * выполняется параллельно, при этом может быть превышено время ожидание. Если слушатель при этом выполнится после
   * превышения времени ожидания, то будет выведенно соответствующее сообщение
   * @param name - название события
   * @param args - аргументы
   * @return Массив объектов Response
   */
  async emit(name: string, ...args: any): Promise<Response[]> {
    sails.log.silly(`AwaitEmitter > new emit: ${name}`);

    const that = this;
    const event = this.events.find((l) => l.name === name);
    if (!event) return [];

    const res: Response[] = [];

    const executor = event.fns.map(
      (f) =>
        async function () {
          try {
            if (sails.config.log && sails.config.log.level === "silly") {
              let debugRay = "ROUND: " + Math.floor(Math.random() * 1000000000) + 1 + " < " + new Date();
              args = args.map((arg) => {
                if (typeof arg === "object") {
                  return new Proxy(arg, {
                    set: function (target, key, value) {
                      let label = `
-----------------------------------------------------------------
From \x1b[40m\x1b[33m\x1b[5m ${f.label} \x1b[0m : ${debugRay}
\x1b[33m${key} : ${JSON.stringify(value, null, 2)} \x1b[0m
  
method listing:

${f.fn}

\x1b[32m ↷↷↷↷↷↷↷↷↷↷↷
${JSON.stringify(target, null, 2)}


TRACE: 
                    `;
                      console.trace(label);
                      target[key] = value;
                      return true;
                    },
                  });
                } else {
                  return arg;
                }
              });
            }
            const r = f.fn.apply(that, args);
            if (isPromise(r)) {
              let timeoutEnd = false;
              let successEnd = false;

              const timeout = async function () {
                await sleep(that.timeout);
                if (!successEnd) {
                  timeoutEnd = true;
                  res.push(new Response(f.label, null, null, true));
                }
              };

              const decorator = async function () {
                const now = new Date();
                try {
                  const res1 = await r;
                  if (!timeoutEnd) {
                    successEnd = true;
                    res.push(new Response(f.label, res1));
                  } else {
                    const listenerName = f.label || "some";
                    sails.log.warn(listenerName, "event of action", name, "in", that.name, "emitter end after", new Date().getTime() - now.getTime(), "ms");
                  }
                } catch (e) {
                  successEnd = true;
                  res.push(new Response(f.label, null, e));
                }
              };

              await Promise.race([timeout(), decorator()]);
            } else {
              res.push(new Response(f.label, r));
            }
          } catch (e) {
            res.push(new Response(f.label, null, e));
          }
        }
    );

    await Promise.all(executor.map((f) => f()));

    return res;
  }
}

/**
 * Объект собятия, хранит название события и его слушателей
 */
class Event {
  name: string;
  fns: {
    fn: func;
    label: string;
  }[];

  constructor(name: string) {
    this.name = name;
    this.fns = [];
  }
}

/**
 * Объект ответа, содержит пометку откуда был слушатель, состояние результат (успех, ошибка, таймаут) и результат или
 * ошибку, которые вернула или вызвала функция
 */
class Response {
  label: string;
  state: "success" | "error" | "timeout";
  result: any;
  error: any;

  constructor(label: string, result: any, error?: any, timeout?: boolean) {
    this.label = label;
    this.result = result;
    this.error = error;
    this.state = timeout ? "timeout" : this.error ? "error" : "success";
  }
}
