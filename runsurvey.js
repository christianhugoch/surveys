const {
  span,
  button,
  i,
  a,
  script,
  domReady,
  di,
  h3,
  select,
  option,
  div,
  input,
  label,
  style,
  form,
  p,
  text_attr,
} = require("@saltcorn/markup/tags");
const { radio_group } = require("@saltcorn/markup/helpers");

const View = require("@saltcorn/data/models/view");
const Workflow = require("@saltcorn/data/models/workflow");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const Field = require("@saltcorn/data/models/field");
const {
  jsexprToWhere,
  eval_expression,
  freeVariables,
} = require("@saltcorn/data/models/expression");

const db = require("@saltcorn/data/db");
const {
  stateFieldsToWhere,
  add_free_variables_to_joinfields,
  picked_fields_to_query,
  readState,
} = require("@saltcorn/data/plugin-helper");
const { features } = require("@saltcorn/data/db/state");

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "Survey setting",
        form: async (context) => {
          const table = Table.findOne({ id: context.table_id });
          const mytable = table;
          const fields = table.getFields();
          const { child_field_list, child_relations } =
            await table.get_child_relations();
          const answer_field_opts = {};
          //console.log(child_relations);
          for (const { table, key_field } of child_relations) {
            const rel = `${table.name}.${key_field.name}`;
            answer_field_opts[rel] = [];
            table.fields
              .filter((f) => f.type?.name === "String")
              .forEach((f) => {
                answer_field_opts[rel].push(f.name);
              });
            /*  const keyFields = table.fields.filter(
              (f) =>
                f.type === "Key" && !["_sc_files"].includes(f.reftable_name)
            );
           for (const kf of keyFields) {
              const joined_table = await Table.findOne({
                name: kf.reftable_name,
              });
              if (!joined_table) continue;
              await joined_table.getFields();
              joined_table.fields.forEach((jf) => {
                agg_field_opts.push({
                  label: `${table.name}.${key_field.name}&#8594;${kf.name}&#8594;${jf.name}`,
                  name: `${table.name}.${key_field.name}.${kf.name}.${jf.name}`,
                });
              });
            }*/
          }

          console.log("AFOs", answer_field_opts);
          return new Form({
            blurb: "Survey fields and answer relation",
            fields: [
              {
                name: "title_field",
                label: "Title field",
                type: "String",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type?.name === "String")
                    .map((f) => f.name),
                },
              },
              {
                name: "options_field",
                label: "Options field",
                sublabel: "Field holding the possible answers to the question",
                type: "String",
                required: true,
                attributes: {
                  options: fields
                    .filter((f) => f.type?.name === "String")
                    .map((f) => f.name),
                },
              },
              {
                name: "answer_relation",
                label: "Answer relation",
                sublabel: "Answer rows will be generated by this relation", // todo more detailed explanation
                input_type: "select",
                options: child_field_list,
              },
              {
                name: "answer_field",
                label: "Answer field",
                sublabel: "This field will be filled with the answer", // todo more detailed explanation
                type: "String",
                attributes: {
                  calcOptions: ["answer_relation", answer_field_opts],
                },
              },
              // answer relation
              // answer choice field
              // answer row values
              // order questions by
              // autosave or submit button
              // destination
            ],
          });
        },
      },
    ],
  });

const get_state_fields = async (table_id, viewname, { show_view }) => {
  const table = Table.findOne(table_id);
  const table_fields = table.fields;
  return table_fields
    .filter((f) => !f.primary_key)
    .map((f) => {
      const sf = new Field(f);
      sf.required = false;
      return sf;
    });
};

const run = async (
  table_id,
  viewname,
  { title_field, options_field, answer_relation, answer_field },
  state,
  extra
) => {
  // what questions are in state?
  const table = await Table.findOne({ id: table_id });
  const fields = table.fields;
  readState(state, fields);
  const where = await stateFieldsToWhere({ fields, state, table });
  const qs = await table.getRows(where);

  return form(
    {},
    qs.map((q) =>
      div(
        p(q[title_field]),
        radio_group({
          name: `q${q[table.pk_name]}`,
          options: q[options_field].split(",").map((s) => s.trim()),
        })
      )
    )
  );
};

module.exports = {
  name: "Survey",
  display_state_form: false,
  get_state_fields,
  configuration_workflow,
  run,
};
