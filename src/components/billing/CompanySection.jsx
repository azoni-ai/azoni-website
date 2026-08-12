import React from 'react';

// Standing reference notes, separate from the daily log: who people are, how
// their processes work, links, anything worth finding again fast.
const CompanySection = ({ data, mutate }) => (
  <div className="billing-card">
    <h3>Company notes</h3>
    <label className="billing-fld full">
      <textarea
        className="billing-companynote"
        rows={22}
        placeholder={
          'People and who they are, processes, links, decisions.\n\n' +
          'Reid — CEO, signs the contract, main contact\n' +
          'Matt — dev lead, owns OpenCart, first working session scheduled...\n'
        }
        value={data.companyNotes}
        onChange={(e) => mutate((d) => ({ ...d, companyNotes: e.target.value }))}
      />
    </label>
    <p className="billing-hint">
      Saves automatically with everything else. Keep passwords and account numbers out of here.
    </p>
  </div>
);

export default CompanySection;
