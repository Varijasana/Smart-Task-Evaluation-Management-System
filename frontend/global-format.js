
// Global date formatting override to ensure DD/MM/YYYY
(function () {
  const originalToLocaleDateString = Date.prototype.toLocaleDateString;

  Date.prototype.toLocaleDateString = function (locale, options) {
    // If locale is 'en-GB' or implicit, return nice format
    // But we want to enforce DD/MM/YYYY even if no locale arg
    if (locale === 'en-GB' || !locale) {
      const day = String(this.getDate()).padStart(2, '0');
      const month = String(this.getMonth() + 1).padStart(2, '0');
      const year = this.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return originalToLocaleDateString.call(this, locale, options);
  };
})();
