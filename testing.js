//Testing file


class VelocityVector {
    constructor(orient = 0, u = 0, v = 0, isImmutable = 0) {
      this.u = u; //horizonatlly forward
      this.v = v; //vertically down
      this.orientation = orient;
      this.isImmutable = isImmutable;
      //Zero is horizonal, 1 is vertical
    }
    updateValues = (u, v) => {
      if (this.isImmutable) {
        return;
      }
      this.u = u;
      this.v = v;
      return this;
    };
    sudoUpdateValues = (u, v) => {
      this.u = u;
      this.v = v;
      // return this;
    };
    add = (otherVector) => {
      this.u += otherVector.u;
      this.v += otherVector.v;
      return this;
    };
    subtract = (otherVector) => {
      this.u -= otherVector.u;
      this.v -= otherVector.v;
      return this;
    };
    divideBy = (scalar) => {
      this.u /= scalar;
      this.v /= scalar;
      return this;
    };
    multiplyBy = (scalar) => {
      this.u *= scalar;
      this.v *= scalar;
      return this;
    };
    getValue = () => {
      return this.u * (this.orientation == 0) + this.v * (this.orientation == 1);
    };
    adjustValue = (value) => {
      if (this.isImmutable) {
        return;
      }
      this.u += (this.orientation == 0) * value;
      this.v += (this.orientation == 1) * value;
    };
    gravity = (value) => {
      if (this.isImmutable) {
        return;
      }
      this.v += value;
    };
    copyThis = () => {
      let newVec = new VelocityVector(
        this.orientation,
        this.u,
        this.v,
        this.isImmutable
      );
      return newVec;
    };
  }

// console.log()
let vector = new VelocityVector(0, 2, 1, 1);
console.log(vector.getValue())
vector.adjustValue(2)
console.log(vector.getValue())
vector.sudoUpdateValues(5, 4)
console.log(vector.getValue())

const boundryConditions = () => {
    for (let i = 0; i < velocityArrayHorizontal.length; i++) {
      velocityArrayHorizontal[i][0].sudoUpdateValues(0, BOUNDRY_VELOCITY);
      velocityArrayHorizontal[i][1].sudoUpdateValues(0, BOUNDRY_VELOCITY);
      velocityArrayHorizontal[i][
        velocityArrayHorizontal[0].length - 1
      ].sudoUpdateValues( BOUNDRY_VELOCITY, 0);
      velocityArrayHorizontal[i][
        velocityArrayHorizontal[0].length - 2
      ].sudoUpdateValues(10, BOUNDRY_VELOCITY);
      console.log(velocityArrayHorizontal[0][velocityArrayHorizontal[0].length - 2].getValue());
  
  
    }
  };

const initializeVelocityVectors = (width, height) => {
    for (let y = 0; y < height; y++) {
      let row = [];
      for (let x = 0; x < width + 1; x++) {
        row.push(new VelocityVector((orient = 1)));
      }
      velocityArrayHorizontal.push(row);
    }
    for (let y = 0; y < height + 1; y++) {
      let row = [];
      for (let x = 0; x < width; x++) {
        row.push(new VelocityVector(1));
      }
      velocityArrayVertical.push(row);
    }
  };