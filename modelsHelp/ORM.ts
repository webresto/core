export default interface ORM {
  destroy();

  save(): Promise<void>;

  remove();

  add();
}
