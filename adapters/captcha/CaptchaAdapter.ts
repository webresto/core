/**
 * An abstract Captcha adapter class. Used to create new Captcha adapters.
 */

export type CaptchaJob = {
  id: string
  task: string | number
}

export type TaskStorage  = {
  [key: string]: { 
    task: CaptchaJob
    time: number
    [key: string]: string | boolean | number | any
  } 
}

export default abstract class CaptchaAdapter {
  public static taskStorage: TaskStorage = {};

  /**
   * get work for captcha
   */
  public abstract getJob(): Promise<CaptchaJob>;

  /**
   * check results
   */
  public abstract check(id: string, result: string): Promise<boolean>;
}
