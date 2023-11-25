import slugify from "slugify";

export async function slugIt(model: string, name: string, slugField = 'slug', opts?: string[]): Promise<string>{
  if(!Object.keys(sails.models).includes(model)) throw `Sails not have models [${model}]`
  if (!Object.keys(sails.models[model].attributes).includes(slugField)) throw `Model with name [${model}] has not field field [${slugField}]`


  let postfix:string = ""
  if (opts.length) { 
    postfix = "-" + opts.length ? opts.join(' ') : '';
  }
  let slug = slugify(`${name}${postfix}`, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en'});

  let criteria = {}
  criteria[slugField] = { contains: slug };
  const count = await sails.models[model].count(criteria)
  slug = count === 0 ? slug : slug+"-"+count
  return slug;
}