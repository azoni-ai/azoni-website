import React from 'react';

// Standing reference notes, separate from the daily log: who people are, how
// their processes work, links, anything worth finding again fast.
const CompanySection = ({ data, mutate }) => (
  <div className="billing-card">
    <h3>Business notes</h3>
    <p className="billing-hint">Contacts, processes, and decisions you want to find again. Keep account links and usernames in Accounts.</p>
    <label className="billing-fld full">
      <textarea
        className="billing-companynote"
        rows={22}
        aria-label="Business notes"
        placeholder={
          'Useful contacts\n\nHow I run the business\n\nDecisions and reminders'
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
