const { expect } = require('chai');
const { validateSearchTerm } = require('../app.js');

describe('Search Term Validation (OWASP C3)', () => {

    // ---------- Valid inputs ----------
    it('should accept basic letters', () => {
        expect(validateSearchTerm('hello')).to.be.true;
    });

    it('should accept words with spaces', () => {
        expect(validateSearchTerm('hello world test')).to.be.true;
    });

    it('should accept digits', () => {
        expect(validateSearchTerm('test123')).to.be.true;
    });

    it('should accept hyphens, underscores, and periods', () => {
        expect(validateSearchTerm('my-search_term.valid')).to.be.true;
    });

    it('should accept single character', () => {
        expect(validateSearchTerm('a')).to.be.true;
    });

    it('should accept 100 character max', () => {
        expect(validateSearchTerm('a'.repeat(100))).to.be.true;
    });

    // ---------- Invalid: SQL Injection ----------
    it('should reject SQL injection with single quote', () => {
        expect(validateSearchTerm("' OR 1=1 --")).to.be.false;
    });

    it('should reject SQL injection with UNION', () => {
        expect(validateSearchTerm("' UNION SELECT * FROM users--")).to.be.false;
    });

    it('should reject semicolons (SQL injection)', () => {
        expect(validateSearchTerm("'; DROP TABLE users; --")).to.be.false;
    });

    // ---------- Invalid: XSS ----------
    it('should reject XSS script tags', () => {
        expect(validateSearchTerm('<script>alert("xss")</script>')).to.be.false;
    });

    it('should reject XSS with event handlers', () => {
        expect(validateSearchTerm('<img onerror="alert(1)">')).to.be.false;
    });

    it('should reject XSS with javascript:', () => {
        expect(validateSearchTerm('javascript:alert(1)')).to.be.false;
    });

    // ---------- Invalid: empty / missing ----------
    it('should reject empty string', () => {
        expect(validateSearchTerm('')).to.be.false;
    });

    it('should reject whitespace-only string', () => {
        expect(validateSearchTerm('   ')).to.be.false;
    });

    it('should reject null', () => {
        expect(validateSearchTerm(null)).to.be.false;
    });

    it('should reject undefined', () => {
        expect(validateSearchTerm(undefined)).to.be.false;
    });

    // ---------- Invalid: too long ----------
    it('should reject > 100 characters', () => {
        expect(validateSearchTerm('a'.repeat(101))).to.be.false;
    });

    // ---------- Invalid: special chars not on allow-list ----------
    it('should reject angle brackets', () => {
        expect(validateSearchTerm('test<>')).to.be.false;
    });

    it('should reject ampersand', () => {
        expect(validateSearchTerm('test&')).to.be.false;
    });

    it('should reject equals sign', () => {
        expect(validateSearchTerm('test=')).to.be.false;
    });

    it('should reject parentheses', () => {
        expect(validateSearchTerm('test()')).to.be.false;
    });

});
