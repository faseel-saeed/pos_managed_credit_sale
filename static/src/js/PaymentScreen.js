odoo.define('pos_managed_credit_sale.PaymentScreen', function(require) {
    "use strict";

    const { parse } = require('web.field_utils');
    const { useErrorHandlers } = require('point_of_sale.custom_hooks');
    const NumberBuffer = require('point_of_sale.NumberBuffer');
    const { useListener } = require("@web/core/utils/hooks");
    const Registries = require('point_of_sale.Registries');
    const { isConnectionError } = require('point_of_sale.utils');
    const utils = require('web.utils');

    const PaymentScreen = require('point_of_sale.PaymentScreen');



    const ManagedCreditSalePaymentScreen = (PaymentScreen) => class extends PaymentScreen {

        async _finalizeValidation() {

            //console.log("==========_finalizeValidation==========");
            let syncOrderResult, hasError, creditCheckResult;
            let isOverLimit = false;
            let title= '';
            let overLimitErrorMessage = '';

            if(this._is_splitOrder()){
                try {
                    //console.log("==========creditCheckResult==========");
                    let creditCheckResult = await this.env.pos.validate_credit_limit(this.currentOrder);
                    console.log(creditCheckResult);
                    //console.log("==========creditCheckResult==========");

                    if(!creditCheckResult.success){
                        isOverLimit = true;
                        title='Over Limit';
                        overLimitErrorMessage = creditCheckResult.message;
                    }
                }
                catch(Exception){
                    title='Error';
                    overLimitErrorMessage = Exception.message
                    console.log(Exception);
                    hasError= true;

                }

                if(isOverLimit || hasError){
                        this.showPopup('ErrorPopup', {
                                title: title,
                                body: overLimitErrorMessage
                            });
                         return;

                }
            }

            super._finalizeValidation();


        }

        _is_splitOrder(){
            const splitPayments = this.paymentLines.filter(payment => payment.payment_method.split_transactions);
            return splitPayments.length>0;

        }



	}

	Registries.Component.extend(PaymentScreen, ManagedCreditSalePaymentScreen);
	return ManagedCreditSalePaymentScreen;

});
