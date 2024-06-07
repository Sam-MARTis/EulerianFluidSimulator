time = Date.now()
arr = []
for (let i = 0; i< 10e7; i++){
    arr.push(Math.floor(i))
}
console.log(Date.now() - time)