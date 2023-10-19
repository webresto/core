class CouponGenerator {
  constructor(length, secretString) {
    this.length = length;
    this.secretString = secretString;
    this.generatedCoupons = new Set();
    this.collisions = 0;
  }

  calculateCRC(input) {
    let crc = 0xFFFF;
    const combinedInput = input + this.secretString; 

    for (let i = 0; i < combinedInput.length; i++) {
      crc ^= combinedInput.charCodeAt(i);
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc >>= 1;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  generateCoupon() {
    const randomPart = Math.random().toString(36).substring(2, this.length + 2).toUpperCase(); 
    const crc = this.calculateCRC(randomPart); 
    const coupon = randomPart + crc;
    
    if (this.generatedCoupons.has(coupon)) {
      if (this.collisions === 0) {
        this.collisions++; // Увеличиваем счетчик коллизий
        console.log(`Первая коллизия для длинны ${this.length} произошла при генерации на ${this.generatedCoupons.size + 1} - ${coupon}`);
      }
    } else {
      this.generatedCoupons.add(coupon);
    }
    
    return coupon;
  }

  isValidCoupon(coupon) {
    const randomPart = coupon.substring(0, this.length).toUpperCase();
    const crc = coupon.substring(this.length);
    return this.calculateCRC(randomPart) === crc;
  }
  
  bruteforceCouponAttempts(couponLength) {
    let attempts = 0;
    let foundCoupon = null;
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Все символы, которые могут быть в купоне
  
    const generateNextCoupon = (currentCoupon) => {
      const index = characters.indexOf(currentCoupon[currentCoupon.length - 1]);
      if (index === characters.length - 1) {
        return generateNextCoupon(currentCoupon.slice(0, -1)) + characters[0];
      } else {
        return currentCoupon.slice(0, -1) + characters[index + 1];
      }
    };
  
    let coupon = "A".repeat(couponLength); // Начинаем с купона, состоящего из первого символа
  
    while (!foundCoupon) {
      if (this.isValidCoupon(coupon)) {
        foundCoupon = coupon;
      }
  
      attempts++;
      console.log(attempts, coupon);
  
      coupon = generateNextCoupon(coupon);
    }
  
    return [attempts, foundCoupon];
  }
  getCollisions() {
    return this.collisions;
  }
}

// Пример использования
const secretString = Math.random().toString(36).substring(2, this.length + 12222).toUpperCase();
const couponGenerator = new CouponGenerator(2, secretString); 
let attempt = couponGenerator.bruteforceCouponAttempts(5);
console.log(attempt)