class CouponGenerator {
  constructor(length, randomString) {
    this.length = length;
    this.randomString = randomString;
    this.generatedCoupons = new Set();
    this.collisions = 0;
  }

  calculateCRC(input) {
    let crc = 0xFFFF;
    const combinedInput = input + this.randomString; 

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

  getCollisions() {
    return this.collisions;
  }
}

// Пример использования
const randomString = " В iikoCard можно настроить рассылки двух типов: ";

for (let length = 2; length <= 10; length++) {
  const couponGenerator = new CouponGenerator(length, randomString); 
  for (let i = 0; i < 1000000; i++) {
    couponGenerator.generateCoupon();
  }

  const data = [{ length: couponGenerator.length, firstCollisionGeneration: couponGenerator.getCollisions() > 0 ? couponGenerator.getCollisions() : 'N/A' }];
  console.table(data);
}
