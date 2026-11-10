class complex_num{
    constructor(a,b){
        this.a = a;
        this.b = b;
    }
    print() {
        console.log("%.4f + i%.4f", this.a, this.b);    
    }
    mag(){
        return Math.sqrt((this.a*this.a) + (this.b*this.b));
    }
    arg(){
        return Math.atan2(this.b,this.a);
    }
    //may extend
}
function log_z(z){
    var real_part = Math.log(z.mag());
    var img_part = z.arg();
    return new complex_num(real_part, img_part);
}
function test(){
    var c_num = new complex_num(-3,0);
    c_num.print();
    var log_c_num = log_z(c_num);
    log_c_num.print();
}
test();