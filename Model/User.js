export class User {
    // Private fields (with # prefix)
    #accountName;
    #password;
    #firstName;
    #lastName;
    #email;
    #dob;
  
    constructor(accountName, password, firstName, lastName, email, dob) {
      this.#accountName = accountName;
      this.#password = password;
      this.#firstName = firstName;
      this.#lastName = lastName;
      this.#email = email;
      this.#dob = dob;
    }
  


    login(accountName, password){
        return this.#accountName === accountName &&
                this.#password === password;
    }
  
    getPublicData() {
      return {
        name: `${this.#firstName} ${this.#lastName}`,
        email: this.#email,
        dob: this.#dob
      };
    }
  
    print() {
      const data = this.getPublicData();
      console.log(`שם מלא: ${data.name}, אימייל: ${data.email}, תאריך לידה: ${data.dob}`);
    }
  }
  