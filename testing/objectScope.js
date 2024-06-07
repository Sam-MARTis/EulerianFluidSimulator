class One{
  constructor(){
    this.id = Math.floor(Math.random()*100)
    console.log("One created. ID: " + this.id)
  }
  doubleID = () => {
    this.id *= 2
    console.log("Doubled id to: "+ this.id)
  }
}


class Two{
  constructor(){

  }

  getOne = (_one) => {
    console.log("getting one")
    this.one = _one
    console.log("Two's one is: "+this.one.id)


  }
  doubleOneID = ()=> {
    console.log("Doubling one of two")
    this.one.doubleID()
    console.log("Two's one's id is doubled to: "+ this.one.id)
  }

}

let o1 = new One()
o1.doubleID()
let d1 = new Two()
d1.getOne(o1)
d1.doubleOneID()
console.log("Origiginal one's id is now: "+o1.id)
o1.doubleID()
console.log(d1.one.id)
